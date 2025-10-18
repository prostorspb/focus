import React, { useState } from 'react';
import { CameraIcon, MicrophoneIcon } from './icons';

interface OnboardingScreenProps {
  onComplete: () => void;
}

export const OnboardingScreen: React.FC<OnboardingScreenProps> = ({ onComplete }) => {
  const [step, setStep] = useState(0);
  const [permissionsGranted, setPermissionsGranted] = useState({
    camera: false,
    microphone: false,
  });
  const [isRequesting, setIsRequesting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const requestPermissions = async () => {
    setIsRequesting(true);
    setErrorMessage('');

    try {
      // Request camera permission
      let cameraGranted = false;
      try {
        const videoStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
          audio: false
        });
        videoStream.getTracks().forEach(track => track.stop());
        setPermissionsGranted(prev => ({ ...prev, camera: true }));
        cameraGranted = true;
      } catch (cameraError: any) {
        console.error('Camera permission denied:', cameraError);
        if (cameraError.name === 'NotAllowedError') {
          setErrorMessage('Доступ к камере был отклонён. Нажмите "Разрешить" в диалоге браузера.');
        } else if (cameraError.name === 'NotFoundError') {
          setErrorMessage('Камера не найдена на устройстве.');
        } else {
          setErrorMessage(`Ошибка доступа к камере: ${cameraError.message}`);
        }
        setIsRequesting(false);
        return;
      }

      // Request microphone permission
      let microphoneGranted = false;
      try {
        const audioStream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: false
        });
        audioStream.getTracks().forEach(track => track.stop());
        setPermissionsGranted(prev => ({ ...prev, microphone: true }));
        microphoneGranted = true;
      } catch (micError: any) {
        console.error('Microphone permission denied:', micError);
        if (micError.name === 'NotAllowedError') {
          setErrorMessage('Доступ к микрофону был отклонён. Нажмите "Разрешить" в диалоге браузера.');
        } else if (micError.name === 'NotFoundError') {
          setErrorMessage('Микрофон не найден на устройстве.');
        } else {
          setErrorMessage(`Ошибка доступа к микрофону: ${micError.message}`);
        }
        setIsRequesting(false);
        return;
      }

      // Both permissions granted - move to tutorial
      if (cameraGranted && microphoneGranted) {
        setIsRequesting(false);
        setTimeout(() => {
          setStep(2);
        }, 500);
      }
    } catch (error) {
      console.error('Unexpected error:', error);
      setErrorMessage('Произошла непредвиденная ошибка. Попробуйте снова.');
      setIsRequesting(false);
    }
  };

  const screens = [
    // Welcome screen
    <div key="welcome" className="flex flex-col items-center justify-center h-full px-6 text-center">
      <div className="mb-8">
        <div className="w-32 h-32 mx-auto mb-6 bg-blue-600 rounded-3xl flex items-center justify-center">
          <span className="text-6xl font-bold text-white">F</span>
        </div>
        <h1 className="text-4xl font-bold mb-4">Focus</h1>
        <p className="text-xl text-gray-300">ADHD Companion</p>
      </div>
      <p className="text-lg text-gray-400 mb-8 max-w-md">
        Минималистичное приложение для быстрой фиксации мыслей без отвлечений
      </p>
      <button
        onClick={() => setStep(1)}
        className="bg-blue-600 text-white px-8 py-4 rounded-full text-lg font-semibold hover:bg-blue-700 transition-colors"
      >
        Начать
      </button>
    </div>,

    // Permissions request screen
    <div key="permissions" className="flex flex-col items-center justify-center h-full px-6 text-center">
      <h2 className="text-3xl font-bold mb-6">Разрешения</h2>
      <p className="text-lg text-gray-400 mb-4 max-w-md">
        Focus использует камеру и микрофон для захвата фото и аудио заметок
      </p>
      {!permissionsGranted.camera && !permissionsGranted.microphone && !errorMessage && (
        <div className="mb-6 p-4 bg-blue-900/20 border border-blue-700 rounded-lg max-w-md">
          <p className="text-blue-200 text-sm">
            💡 При нажатии кнопки браузер запросит разрешения. Пожалуйста, выберите <strong>"Разрешить"</strong> в диалоге.
          </p>
        </div>
      )}

      <div className="space-y-4 mb-8 w-full max-w-md">
        <div className="bg-gray-800 p-6 rounded-2xl flex items-center">
          <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center mr-4">
            <CameraIcon className="w-6 h-6 text-white" />
          </div>
          <div className="text-left flex-1">
            <h3 className="font-semibold text-lg">Камера</h3>
            <p className="text-sm text-gray-400">Для быстрых фото заметок</p>
          </div>
          {permissionsGranted.camera && (
            <span className="text-green-500 text-2xl">✓</span>
          )}
        </div>

        <div className="bg-gray-800 p-6 rounded-2xl flex items-center">
          <div className="w-12 h-12 bg-red-600 rounded-full flex items-center justify-center mr-4">
            <MicrophoneIcon className="w-6 h-6 text-white" />
          </div>
          <div className="text-left flex-1">
            <h3 className="font-semibold text-lg">Микрофон</h3>
            <p className="text-sm text-gray-400">Для голосовых заметок</p>
          </div>
          {permissionsGranted.microphone && (
            <span className="text-green-500 text-2xl">✓</span>
          )}
        </div>
      </div>

      {errorMessage && (
        <div className="mb-6 p-4 bg-red-900/30 border border-red-500 rounded-lg max-w-md">
          <p className="text-red-300 text-sm mb-2">{errorMessage}</p>
          <p className="text-red-200 text-xs">
            При нажатии на кнопку ниже браузер покажет диалог с запросом разрешений.
            Выберите "Разрешить" для продолжения.
          </p>
        </div>
      )}

      {isRequesting && !errorMessage && (
        <div className="mb-6 p-4 bg-blue-900/30 border border-blue-500 rounded-lg max-w-md">
          <p className="text-blue-300 text-sm">Ожидание разрешения от браузера...</p>
        </div>
      )}

      <button
        onClick={requestPermissions}
        disabled={isRequesting}
        className={`px-8 py-4 rounded-full text-lg font-semibold transition-colors ${
          isRequesting
            ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
            : 'bg-blue-600 text-white hover:bg-blue-700'
        }`}
      >
        {isRequesting ? 'Запрашиваем доступ...' : 'Разрешить доступ'}
      </button>
      <button
        onClick={onComplete}
        disabled={isRequesting}
        className="mt-4 text-gray-500 underline disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Пропустить (функции будут ограничены)
      </button>
    </div>,

    // Tutorial screen
    <div key="tutorial" className="flex flex-col items-center justify-center h-full px-6 text-center">
      <h2 className="text-3xl font-bold mb-6">Как использовать</h2>

      <div className="space-y-6 mb-12 w-full max-w-md">
        <div className="bg-gray-800 p-6 rounded-2xl">
          <div className="text-4xl mb-3">📝</div>
          <h3 className="font-semibold text-lg mb-2">Текстовые заметки</h3>
          <p className="text-sm text-gray-400">Просто начните вводить текст в центральной зоне</p>
        </div>

        <div className="bg-gray-800 p-6 rounded-2xl">
          <div className="text-4xl mb-3">⬆️</div>
          <h3 className="font-semibold text-lg mb-2">Фото заметки</h3>
          <p className="text-sm text-gray-400">Потяните вверх для быстрого снимка</p>
        </div>

        <div className="bg-gray-800 p-6 rounded-2xl">
          <div className="text-4xl mb-3">⬇️</div>
          <h3 className="font-semibold text-lg mb-2">Голосовые заметки</h3>
          <p className="text-sm text-gray-400">Потяните вниз для записи аудио</p>
        </div>
      </div>

      <button
        onClick={onComplete}
        className="bg-blue-600 text-white px-8 py-4 rounded-full text-lg font-semibold hover:bg-blue-700 transition-colors"
      >
        Понятно, начнём!
      </button>
    </div>
  ];

  return (
    <div className="fixed inset-0 bg-gray-900 z-50 overflow-y-auto">
      {screens[step]}
    </div>
  );
};
